
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Container } from '../styles/commonStyles';
import {
  ContentArea,
  FormContainer,
  CategoryLabel,
  FormField,
  TitleInput,
  ContentTextarea,
  ImageSection,
  ImageAddButton,
  ImageAddIcon,
  ImageAddText,
  ImagePreviewContainer,
  ImagePreview,
  ImageDeleteButton,
  RegisterBtnContainer,
  RegisterButton,
} from '../styles/formStyles';
import Header from '../components/BoardHeader';
import Modal from '../components/Modal';
import useModal from '../hooks/useModal';
import usePosts from '../hooks/usePosts';
import Camera from '../components/Icons/Camera.svg';
import useResponsive from '../hooks/useResponsive';

const PostCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // 수정 모드일 때의 게시글 ID
  const { addPost, getPost, updatePost } = usePosts();
  const isPC = useResponsive();

  // 수정 모드인지 확인 (URL에 id가 있으면 수정 모드)
  const isEditMode = Boolean(id);

  // URL에서 카테고리 정보 가져오기 (플로팅 버튼에서 전달받음 - 작성 모드에만 해당)
  const searchParams = new URLSearchParams(location.search);
  const categoryFromUrl = searchParams.get('category') || 'general';
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: categoryFromUrl,
    images: []
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [historyPushed, setHistoryPushed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originalData, setOriginalData] = useState(null); // 수정 모드에서 원본 데이터 저장
  const { isOpen: isExitModalOpen, openModal: openExitModal, closeModal: closeExitModal } = useModal();

  // 수정 모드일 때 기존 게시글 데이터 로드
  useEffect(() => {
    if (isEditMode && id) {
      setIsLoading(true);
      const existingPost = getPost(id);
      
      if (existingPost) {
        // 기존 이미지를 formData.images 형식으로 변환
        const existingImages = existingPost.image 
          ? (Array.isArray(existingPost.image) 
              ? existingPost.image.map((url, index) => ({
                  id: `existing_${index}`,
                  url: url,
                  file: null // 기존 이미지는 file 객체가 없음
                }))
              : [{
                  id: 'existing_0',
                  url: existingPost.image,
                  file: null
                }])
          : [];

        const initialData = {
          title: existingPost.title,
          content: existingPost.content,
          category: existingPost.category,
          images: existingImages
        };

        setFormData(initialData);
        setOriginalData(initialData);
        setIsLoading(false);
      } else {
        // 게시글이 존재하지 않으면 목록으로 리다이렉트
        navigate('/board');
      }
    }
  }, [isEditMode, id, getPost, navigate]);

  // hasUnsavedChanges 계산
  useEffect(() => {
    if (isEditMode && originalData) {
      // 수정 모드: 원본 데이터와 비교해서 변경사항 확인
      const hasChanges = 
        formData.title !== originalData.title ||
        formData.content !== originalData.content ||
        formData.images.length !== originalData.images.length ||
        formData.images.some((img, index) => {
          const originalImg = originalData.images[index];
          return !originalImg || img.url !== originalImg.url;
        });
      setHasUnsavedChanges(hasChanges);
    } else {
      // 작성 모드: 내용이 있으면 변경사항 있음
      const hasContent = formData.title.trim() || formData.content.trim() || formData.images.length > 0;
      setHasUnsavedChanges(hasContent);
    }
  }, [formData, originalData, isEditMode]);

  // 브라우저 이벤트 처리
  useEffect(() => {
    // 페이지 진입 시 히스토리 엔트리를 한 번만 추가
    if (!historyPushed) {
      window.history.pushState(null, '', window.location.href);
      setHistoryPushed(true);
    }

    // 브라우저 새로고침/탭 닫기 방지
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // 브라우저 뒤로가기 방지
    const handlePopState = (e) => {
      e.preventDefault();
      
      if (hasUnsavedChanges) {
        openExitModal();
      } else {
        navigate('/board');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, openExitModal, navigate, historyPushed]);

  // 카테고리 표시 텍스트
  const getCategoryDisplayName = (cat) => {
    switch(cat) {
      case 'general': return '일반 게시판';
      case 'promotion': return '홍보 게시판';
      case 'hot': return '일반 게시판';
      default: return '일반 게시판';
    }
  };

  // 입력값 변경 핸들러
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 이미지 추가 핸들러
  const handleImageAdd = (event) => {
    const files = Array.from(event.target.files);
    const remainingSlots = 5 - formData.images.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, {
            id: Date.now() + Math.random(),
            file: file,
            url: e.target.result
          }]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // 이미지 삭제 핸들러
  const handleImageDelete = (imageId) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  };

  // 완료 버튼 활성화 조건
  const isFormValid = formData.title.trim() && formData.content.trim();

  // 게시글 작성/수정 완료
  const handleSubmit = async () => {
    if (!isFormValid) return;

    try {
      setIsLoading(true);

      if (isEditMode) {
        // 수정 모드: 기존 게시글 업데이트
        const updateData = {
          title: formData.title.trim(),
          content: formData.content.trim(),
          // 카테고리는 수정 시 변경하지 않음 (기존 카테고리 유지)
          images: formData.images.map(img => img.url),
          // 수정 날짜 업데이트 (실제 API에서는 서버에서 처리)
          editedAt: new Date().toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          }).replace(/\. /g, '.').replace('.', '')
        };

        await updatePost(id, updateData);
        
        // 수정 완료 후 상세 페이지로 이동
        navigate(`/board/post/${id}`);
      } else {
        // 작성 모드: 새 게시글 생성
        const newPost = {
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category === 'hot' ? 'general' : formData.category,
          images: formData.images.map(img => img.url),
          author: '익명',
          date: new Date().toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          }).replace(/\. /g, '.').replace('.', ''),
          likes: 0,
          comments: 0,
          isHot: false,
          userId: 'currentUser'
        };

        const createdPost = await addPost(newPost);
        
        // 작성 완료 후 성공 페이지로 이동
        navigate(`/board/create/success?postId=${createdPost.id}`);
      }
    } catch (error) {
      console.error(`게시글 ${isEditMode ? '수정' : '작성'} 실패:`, error);
      // 에러 처리 (토스트 메시지 등)
    } finally {
      setIsLoading(false);
    }
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    if (hasUnsavedChanges) {
      openExitModal();
    } else {
      if (isEditMode) {
        navigate(`/board/post/${id}`); // 수정 모드에서는 상세 페이지로
      } else {
        navigate('/board'); // 작성 모드에서는 목록으로
      }
    }
  };

  // 나가기 확인 모달 액션 
  const exitModalActions = [
    {
      label: '취소',
      type: 'cancel',
      onClick: closeExitModal
    },
    {
      label: '나가기',
      type: 'confirm',
      onClick: () => {
        closeExitModal();
        if (isEditMode) {
          navigate(`/board/post/${id}`);
        } else {
          navigate('/board');
        }
      }
    }
  ];

  // 로딩 중일 때
  if (isEditMode && isLoading) {
    return (
      <Container>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          로딩 중...
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {!isPC && (
        <Header
          title={isEditMode ? "edit" : "create"}
          showBack={true}
          onBack={handleBack}
          onComplete={handleSubmit}
          completeDisabled={!isFormValid || isLoading}
        />
      )}

      <ContentArea>
        <FormContainer>
          <FormField>
            <RegisterBtnContainer>
              <TitleInput
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="제목을 입력하세요"
                maxLength={100}
                disabled={isLoading}
              />
              {isPC && (
                <RegisterButton 
                  disabled={!isFormValid || isLoading} 
                  onClick={isFormValid && !isLoading ? handleSubmit : undefined}
                >
                  {isLoading ? '처리중...' : (isEditMode ? '수정' : '등록')}
                </RegisterButton>
              )}
            </RegisterBtnContainer>
          </FormField>

          <CategoryLabel>{getCategoryDisplayName(formData.category)}</CategoryLabel>
          
          {isPC && (
            <div style={{display: 'flex', justifyContent: 'end'}}>
              <ImageAddButton disabled={formData.images.length >= 5 || isLoading}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageAdd}
                  style={{ display: 'none' }}
                  id="image-upload"
                  disabled={formData.images.length >= 5 || isLoading}
                />
                <label htmlFor="image-upload" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: (formData.images.length >= 5 || isLoading) ? 'not-allowed' : 'pointer',
                  opacity: (formData.images.length >= 5 || isLoading) ? 0.5 : 1
                }}>
                  <ImageAddIcon src={Camera} alt="사진 추가" />
                  <ImageAddText>사진</ImageAddText>
                </label>
              </ImageAddButton>
            </div>
          )}

          <FormField>
            <ContentTextarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="다양한 사람들과 공연에 관해 이야기를 나눠봐요!"
              rows={8}
              disabled={isLoading}
            />
          </FormField>

          <ImageSection>
            {!isPC && ( 
              <ImageAddButton disabled={formData.images.length >= 5 || isLoading}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageAdd}
                  style={{ display: 'none' }}
                  id="image-upload"
                  disabled={formData.images.length >= 5 || isLoading}
                />
                <label htmlFor="image-upload" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: (formData.images.length >= 5 || isLoading) ? 'not-allowed' : 'pointer',
                  opacity: (formData.images.length >= 5 || isLoading) ? 0.5 : 1
                }}>
                  <ImageAddIcon src={Camera} alt="사진 추가" />
                  <ImageAddText>사진</ImageAddText>
                </label>
              </ImageAddButton>
            )}
            
            {formData.images.length > 0 && (
              <ImagePreviewContainer>
                {formData.images.map((image) => (
                  <ImagePreview key={image.id}>
                    <img src={image.url} alt="미리보기" />
                    <ImageDeleteButton 
                      onClick={() => handleImageDelete(image.id)}
                      disabled={isLoading}
                    >
                      ✕
                    </ImageDeleteButton>
                  </ImagePreview>
                ))}
              </ImagePreviewContainer>
            )}
          </ImageSection>
        </FormContainer>
      </ContentArea>

      {/* 나가기 확인 모달 */}
      <Modal
        isOpen={isExitModalOpen}
        onClose={closeExitModal}
        title={isEditMode ? "수정을 취소하시겠어요?" : "작성을 취소하시겠어요?"}
        actions={exitModalActions}
      />
    </Container>
  );
};

export default PostCreatePage;